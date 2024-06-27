import { convertTagsBtoF } from '@/lib/convert-tags';
import { memoize } from '@/lib/memoize';
import { FilterOptions, ResourceType } from '@/types/resource';
import React from 'react';
import { getAllResources, getAllTags } from '../../actions/resource';
import ResourceCard from '../components/resource_card';
import ResourceSearch from '../components/resource_search';
import SelectTag from '../components/select_tag';
import RadioButton from '../components/radio_button';
import NotFoundComponent from '@/components/not-found';
import { filterResources } from '../../lib/filter-resource';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] };
}) {
  const searchQuery =
    typeof searchParams.search === 'string' ? searchParams.search : null;
  const selectedTag =
    typeof searchParams.tag === 'string' ? searchParams.tag : null;
  const filter =
    typeof searchParams.filter === 'string' ? searchParams.filter : 'all';

  const [allResources, allTags] = await Promise.all([
    getAllResources(filter as FilterOptions),
    getAllTags({ all: false }),
  ]);

  const convertTagsBtoFMemo = memoize(convertTagsBtoF);
  const formattedTags = convertTagsBtoFMemo(allTags);

  const filteredResources = memoize(filterResources)({
    resources: allResources,
    query: searchQuery,
    tag: selectedTag,
  });

  return (
    <div className='container my-4 min-h-screen'>
      <div className='my-2 flex flex-col gap-4 md:flex-row'>
        <SelectTag tags={formattedTags} defaultValue={selectedTag ?? ''} />

        <ResourceSearch
          placeholder='Search resource'
          defaultValue={searchQuery ?? ''}
        />
      </div>

      <RadioButton defaultValue={filter ?? ''} />

      <div className='mx-4 my-6'>
        {filteredResources.length === 0 ? (
          <NotFoundComponent />
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredResources.map((res) => (
              <ResourceCard
                key={res.id}
                id={res.id}
                title={res.title}
                description={res.description}
                link={res.link}
                tags={res.tags}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
